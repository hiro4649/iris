import { ContractError } from "../../core/contracts.js";

const FRESH_EVIDENCE_FIELDS = new Set([
  "schema",
  "component",
  "status",
  "evidence_timestamp_ms",
  "evidence_source",
  "freshness",
]);

const FRESH_EVIDENCE_AGGREGATE_FIELDS = new Set([
  "schema",
  "aggregate_status",
  "component_count",
  "ready_component_count",
  "blocked_component_count",
  "attention_component_count",
  "overall_ready",
  "component_summaries",
  "boundary_policy",
]);

const FRESH_EVIDENCE_COMPONENT_SUMMARY_FIELDS = new Set([
  "schema",
  "component",
  "status",
  "freshness",
  "blocker_status",
]);

const FRESH_EVIDENCE_AGGREGATE_BOUNDARY_FIELDS = new Set([
  "safe_aggregate_only",
  "component_status_freshness_only",
  "blocked_component_blocks_overall_ready",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
]);

const STALE_EVIDENCE_CARRYOVER_GUARD_FIELDS = new Set([
  "schema",
  "guard_status",
  "component",
  "previous_status",
  "previous_freshness",
  "carried_over_as",
  "ready_allowed",
  "boundary_policy",
]);

const STALE_EVIDENCE_CARRYOVER_GUARD_BOUNDARY_FIELDS = new Set([
  "safe_guard_only",
  "previous_success_not_reused",
  "stale_evidence_remains_stale",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
]);

const FIXTURE_EVIDENCE_SEPARATION_FIELDS = new Set([
  "schema",
  "component",
  "fixture_pass",
  "real_fresh_evidence",
  "priority1_completion_allowed",
  "separation_status",
  "boundary_policy",
]);

const FIXTURE_EVIDENCE_SEPARATION_BOUNDARY_FIELDS = new Set([
  "fixture_pass_separate_from_real_fresh_evidence",
  "fixture_only_does_not_complete_priority1",
  "safe_status_only",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
]);

const MANUAL_EVIDENCE_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "manual_label",
  "status",
  "evidence_timestamp_ms",
  "boundary_policy",
]);

const MANUAL_EVIDENCE_SAFE_SUMMARY_BOUNDARY_FIELDS = new Set([
  "safe_label_status_timestamp_only",
  "no_raw_note",
  "no_secret",
  "no_path",
]);

const REAL_PROBE_EVIDENCE_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "component",
  "status",
  "evidence_timestamp_ms",
  "count",
  "boundary_policy",
]);

const REAL_PROBE_EVIDENCE_SAFE_SUMMARY_BOUNDARY_FIELDS = new Set([
  "safe_component_status_timestamp_count_only",
  "no_raw_response",
  "no_raw_job",
  "no_raw_payload",
]);

const FRESH_EVIDENCE_PUBLIC_SUMMARY_FIELDS = new Set([
  "schema",
  "component",
  "status",
  "freshness",
  "blocker",
  "boundary_policy",
]);

const FRESH_EVIDENCE_PUBLIC_SUMMARY_BOUNDARY_FIELDS = new Set([
  "public_component_status_freshness_blocker_only",
  "no_raw_evidence_body",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
]);

const FRESH_EVIDENCE_FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "fresh_fixture",
  "stale_fixture",
  "fixture_source_fixture",
  "manual_fixture",
  "leak_reject_fixture",
  "schema_violation_fixture",
  "boundary_policy",
]);

const FRESH_EVIDENCE_FIXTURE_RESULT_FIELDS = new Set([
  "schema",
  "fixture_label",
  "fixture_status",
]);

const FRESH_EVIDENCE_FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "safe_fixture_status_only",
  "fresh_stale_fixture_covered",
  "fixture_manual_source_covered",
  "leak_schema_violation_covered",
  "packet_body_excluded",
  "network_values_excluded",
  "auth_values_excluded",
]);

const EVIDENCE_SOURCES = new Set([
  "fixture",
  "manual",
  "real_probe",
  "operator_confirmed",
]);

const FRESHNESS_LABELS = new Set([
  "fresh",
  "stale",
  "runtime_waiting",
  "attention",
]);

const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|endpoint|url|token|secret|authorization|credential|password|path)(?:$|_)/iu;
const UNSAFE_VALUE_PATTERN =
  /\b(?:https?:\/\/|endpoint|oauth|token|authorization|bearer|api[_ -]?key|secret|raw[_ -]?payload|payload|[a-z]:\\|\/[a-z0-9_.-]+\/)\b/iu;
const FRESH_EVIDENCE_REDACT_FIELD_PATTERN =
  /(?:^|_)(raw|payload|endpoint|url|token|secret|authorization|credential|password|path|command|candidate)(?:$|_)/iu;
const FRESH_EVIDENCE_REDACT_VALUE_PATTERN =
  /\b(?:https?:\/\/|endpoint|oauth|token|authorization|bearer|api[_ -]?key|secret|raw[_ -]?(?:payload|command)|payload|command|candidate|[a-z]:\\|\/[a-z0-9_.-]+\/)\b/iu;

export function createFreshEvidenceEnvelope({
  component,
  status,
  evidenceTimestampMs,
  evidenceSource,
  freshness,
  nowMs = Date.now(),
  freshWindowMs = 30_000,
} = {}) {
  const evidence_timestamp_ms = normalizeTimestampMs(evidenceTimestampMs);
  const sourceClassification = classifyFreshEvidenceSource(evidenceSource);
  const ageFreshness = FRESHNESS_LABELS.has(freshness)
    ? classifyFreshEvidenceAge({
        evidenceTimestampMs: evidence_timestamp_ms,
        freshness,
        nowMs,
        freshWindowMs,
      })
    : classifyFreshEvidenceAge({
        evidenceTimestampMs: evidence_timestamp_ms,
        nowMs,
        freshWindowMs,
      });
  const envelope = {
    schema: "iris_fresh_evidence_envelope_v1",
    component: safeLabel(component, 80),
    status: safeLabel(status, 80),
    evidence_timestamp_ms,
    evidence_source: sourceClassification.evidence_source,
    freshness:
      ageFreshness === "fresh" && !sourceClassification.real_evidence
        ? "runtime_waiting"
        : ageFreshness,
  };
  assertFreshEvidenceEnvelopeSafe(envelope);
  return envelope;
}

export function classifyFreshEvidenceSource(evidenceSource) {
  const source = EVIDENCE_SOURCES.has(evidenceSource) ? evidenceSource : "manual";
  return {
    evidence_source: source,
    real_evidence: source === "real_probe" || source === "operator_confirmed",
  };
}

export function createFreshEvidenceAggregateSummary({ evidence = [] } = {}) {
  const envelopes = Array.isArray(evidence) ? evidence : [];
  const componentSummaries = envelopes.map((envelope) => {
    assertFreshEvidenceEnvelopeSafe(envelope, "fresh evidence aggregate item");
    return {
      schema: "iris_fresh_evidence_component_summary_v1",
      component: envelope.component,
      status: envelope.status,
      freshness: envelope.freshness,
      blocker_status:
        envelope.status === "BLOCKED" || envelope.freshness !== "fresh"
          ? "BLOCKED"
          : "clear",
    };
  });
  const blockedCount = componentSummaries.filter(
    (item) => item.blocker_status === "BLOCKED"
  ).length;
  const attentionCount = componentSummaries.filter(
    (item) => item.blocker_status !== "BLOCKED" && item.freshness !== "fresh"
  ).length;
  const summary = {
    schema: "iris_fresh_evidence_aggregate_summary_v1",
    aggregate_status: blockedCount > 0 ? "BLOCKED" : "ready",
    component_count: componentSummaries.length,
    ready_component_count: componentSummaries.filter(
      (item) => item.blocker_status === "clear"
    ).length,
    blocked_component_count: blockedCount,
    attention_component_count: attentionCount,
    overall_ready: blockedCount === 0,
    component_summaries: componentSummaries,
    boundary_policy: Object.fromEntries(
      [...FRESH_EVIDENCE_AGGREGATE_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertFreshEvidenceAggregateSummarySafe(summary);
  return summary;
}

export function createStaleEvidenceCarryoverGuard({
  previousEvidence,
  nowMs = Date.now(),
  freshWindowMs = 30_000,
} = {}) {
  assertFreshEvidenceEnvelopeSafe(previousEvidence, "stale evidence carryover source");
  const previousFreshness = classifyFreshEvidenceAge({
    evidenceTimestampMs: previousEvidence.evidence_timestamp_ms,
    freshness: previousEvidence.freshness,
    nowMs,
    freshWindowMs,
  });
  const carriedOverAs = previousFreshness === "fresh" ? "fresh" : "stale";
  const guard = {
    schema: "iris_stale_evidence_carryover_guard_v1",
    guard_status: carriedOverAs === "fresh" ? "fresh_evidence_available" : "stale",
    component: previousEvidence.component,
    previous_status: previousEvidence.status,
    previous_freshness: previousFreshness,
    carried_over_as: carriedOverAs,
    ready_allowed: carriedOverAs === "fresh" && previousEvidence.status !== "BLOCKED",
    boundary_policy: Object.fromEntries(
      [...STALE_EVIDENCE_CARRYOVER_GUARD_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertStaleEvidenceCarryoverGuardSafe(guard);
  return guard;
}

export function createFixtureEvidenceSeparation({
  component = "priority1",
  fixturePass = false,
  realFreshEvidence = false,
} = {}) {
  const summary = {
    schema: "iris_fixture_evidence_separation_v1",
    component: safeLabel(component, 80),
    fixture_pass: fixturePass === true,
    real_fresh_evidence: realFreshEvidence === true,
    priority1_completion_allowed: realFreshEvidence === true,
    separation_status:
      realFreshEvidence === true
        ? "real_fresh_evidence"
        : fixturePass === true
          ? "fixture_pass_real_blocked"
          : "blocked",
    boundary_policy: Object.fromEntries(
      [...FIXTURE_EVIDENCE_SEPARATION_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertFixtureEvidenceSeparationSafe(summary);
  return summary;
}

export function createManualEvidenceSafeSummary({
  manualLabel = "operator_confirmed",
  status = "attention",
  evidenceTimestampMs,
} = {}) {
  const summary = {
    schema: "iris_manual_evidence_safe_summary_v1",
    manual_label: safeLabel(manualLabel, 80),
    status: safeLabel(status, 80),
    evidence_timestamp_ms: normalizeTimestampMs(evidenceTimestampMs),
    boundary_policy: Object.fromEntries(
      [...MANUAL_EVIDENCE_SAFE_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertManualEvidenceSafeSummary(summary);
  return summary;
}

export function createRealProbeEvidenceSafeSummary({
  component = "probe",
  status = "attention",
  evidenceTimestampMs,
  count = 0,
} = {}) {
  const summary = {
    schema: "iris_real_probe_evidence_safe_summary_v1",
    component: safeLabel(component, 80),
    status: safeLabel(status, 80),
    evidence_timestamp_ms: normalizeTimestampMs(evidenceTimestampMs),
    count: normalizeNonNegativeInteger(count),
    boundary_policy: Object.fromEntries(
      [...REAL_PROBE_EVIDENCE_SAFE_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertRealProbeEvidenceSafeSummary(summary);
  return summary;
}

export function redactFreshEvidence(value) {
  const redacted = redactFreshEvidenceValue(value);
  assertNoUnsafeFreshEvidenceRedactionValues(redacted, "fresh evidence redaction");
  return redacted;
}

export function createFreshEvidencePublicSummary({ evidence } = {}) {
  assertFreshEvidenceEnvelopeSafe(evidence, "fresh evidence public summary source");
  const summary = {
    schema: "iris_fresh_evidence_public_summary_v1",
    component: evidence.component,
    status: evidence.status,
    freshness: evidence.freshness,
    blocker:
      evidence.status === "BLOCKED" || evidence.freshness !== "fresh"
        ? "BLOCKED"
        : "clear",
    boundary_policy: Object.fromEntries(
      [...FRESH_EVIDENCE_PUBLIC_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertFreshEvidencePublicSummarySafe(summary);
  return summary;
}

export function createFreshEvidenceFixturePack({ nowMs = 10_000 } = {}) {
  const fixtureNowMs = Math.max(normalizeTimestampMs(nowMs), 90_000);
  const fresh = createFreshEvidenceEnvelope({
    component: "fixture_pack_fresh",
    status: "ready",
    evidenceTimestampMs: fixtureNowMs,
    evidenceSource: "real_probe",
    freshness: "fresh",
    nowMs: fixtureNowMs,
  });
  const stale = createFreshEvidenceEnvelope({
    component: "fixture_pack_stale",
    status: "ready",
    evidenceTimestampMs: fixtureNowMs - 60_000,
    evidenceSource: "real_probe",
    freshness: "fresh",
    nowMs: fixtureNowMs,
    freshWindowMs: 30_000,
  });
  const fixtureSource = createFreshEvidenceEnvelope({
    component: "fixture_pack_fixture",
    status: "ready",
    evidenceTimestampMs: fixtureNowMs,
    evidenceSource: "fixture",
    freshness: "fresh",
    nowMs: fixtureNowMs,
  });
  const manual = createFreshEvidenceEnvelope({
    component: "fixture_pack_manual",
    status: "confirmed",
    evidenceTimestampMs: fixtureNowMs,
    evidenceSource: "manual",
    freshness: "fresh",
    nowMs: fixtureNowMs,
  });
  const secretLeakStatus = capturesContractError(() =>
    assertFreshEvidenceEnvelopeSafe({
      ...fresh,
      token: "secret",
    })
  );
  const schemaViolationStatus = capturesContractError(() =>
    assertFreshEvidenceEnvelopeSafe({
      ...fresh,
      unexpected_field: "value",
    })
  );
  const pack = {
    schema: "iris_fresh_evidence_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 6,
    fresh_fixture: createFixtureResult("fresh", fresh.freshness),
    stale_fixture: createFixtureResult("stale", stale.freshness),
    fixture_source_fixture: createFixtureResult(
      "fixture_source",
      fixtureSource.freshness
    ),
    manual_fixture: createFixtureResult("manual", manual.evidence_source),
    leak_reject_fixture: createFixtureResult("leak_reject", secretLeakStatus),
    schema_violation_fixture: createFixtureResult(
      "schema_violation",
      schemaViolationStatus
    ),
    boundary_policy: Object.fromEntries(
      [...FRESH_EVIDENCE_FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
  };
  assertFreshEvidenceFixturePackSafe(pack);
  return pack;
}

export function classifyFreshEvidenceAge({
  evidenceTimestampMs,
  freshness = "fresh",
  nowMs = Date.now(),
  freshWindowMs = 30_000,
} = {}) {
  const timestampMs = normalizeTimestampMs(evidenceTimestampMs);
  const currentMs = normalizeTimestampMs(nowMs);
  const maxAgeMs = normalizePositiveMs(freshWindowMs, 30_000);
  if (!FRESHNESS_LABELS.has(freshness)) return "attention";
  if (freshness !== "fresh") return freshness;
  if (timestampMs === 0 || currentMs === 0) return "runtime_waiting";
  if (timestampMs > currentMs) return "attention";
  return currentMs - timestampMs <= maxAgeMs ? "fresh" : "stale";
}

export function assertFreshEvidenceEnvelopeSafe(
  envelope,
  context = "fresh evidence envelope"
) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    throw new ContractError(`${context}: envelope is required`);
  }
  for (const field of Object.keys(envelope)) {
    if (!FRESH_EVIDENCE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  for (const field of FRESH_EVIDENCE_FIELDS) {
    if (!Object.hasOwn(envelope, field)) {
      throw new ContractError(`${context}: missing field`, { field });
    }
  }
  if (envelope.schema !== "iris_fresh_evidence_envelope_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!isSafeLabel(envelope.component) || !isSafeLabel(envelope.status)) {
    throw new ContractError(`${context}: invalid component or status`);
  }
  if (
    !Number.isInteger(envelope.evidence_timestamp_ms) ||
    envelope.evidence_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid evidence timestamp`);
  }
  if (!EVIDENCE_SOURCES.has(envelope.evidence_source)) {
    throw new ContractError(`${context}: invalid evidence source`);
  }
  if (!FRESHNESS_LABELS.has(envelope.freshness)) {
    throw new ContractError(`${context}: invalid freshness`);
  }
  assertNoUnsafeEvidenceValues(envelope, context);
}

export function assertFreshEvidenceAggregateSummarySafe(
  summary,
  context = "fresh evidence aggregate summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !FRESH_EVIDENCE_AGGREGATE_FIELDS.has(field) ||
      (field !== "boundary_policy" && UNSAFE_FIELD_PATTERN.test(field))
    ) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    summary.schema !== "iris_fresh_evidence_aggregate_summary_v1" ||
    !["ready", "BLOCKED"].includes(summary.aggregate_status) ||
    typeof summary.overall_ready !== "boolean" ||
    !Array.isArray(summary.component_summaries)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  let readyCount = 0;
  let blockedCount = 0;
  let attentionCount = 0;
  for (const item of summary.component_summaries) {
    assertFreshEvidenceComponentSummarySafe(item, context);
    if (item.blocker_status === "BLOCKED") blockedCount += 1;
    else readyCount += 1;
    if (item.blocker_status !== "BLOCKED" && item.freshness !== "fresh") {
      attentionCount += 1;
    }
  }
  if (
    summary.component_count !== summary.component_summaries.length ||
    summary.ready_component_count !== readyCount ||
    summary.blocked_component_count !== blockedCount ||
    summary.attention_component_count !== attentionCount ||
    summary.overall_ready !== (blockedCount === 0) ||
    summary.aggregate_status !== (blockedCount > 0 ? "BLOCKED" : "ready")
  ) {
    throw new ContractError(`${context}: aggregate mismatch`);
  }
  assertFreshEvidenceAggregateBoundaryPolicy(summary.boundary_policy, context);
}

export function assertStaleEvidenceCarryoverGuardSafe(
  guard,
  context = "stale evidence carryover guard"
) {
  if (!guard || typeof guard !== "object" || Array.isArray(guard)) {
    throw new ContractError(`${context}: guard is required`);
  }
  for (const field of Object.keys(guard)) {
    if (
      !STALE_EVIDENCE_CARRYOVER_GUARD_FIELDS.has(field) ||
      (field !== "boundary_policy" && UNSAFE_FIELD_PATTERN.test(field))
    ) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    guard.schema !== "iris_stale_evidence_carryover_guard_v1" ||
    !["fresh_evidence_available", "stale"].includes(guard.guard_status) ||
    !isSafeLabel(guard.component) ||
    !isSafeLabel(guard.previous_status) ||
    !FRESHNESS_LABELS.has(guard.previous_freshness) ||
    !["fresh", "stale"].includes(guard.carried_over_as) ||
    typeof guard.ready_allowed !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid guard`);
  }
  if (
    guard.previous_freshness !== "fresh" &&
    (guard.carried_over_as !== "stale" ||
      guard.guard_status !== "stale" ||
      guard.ready_allowed !== false)
  ) {
    throw new ContractError(`${context}: stale evidence cannot be ready`);
  }
  if (guard.previous_status === "BLOCKED" && guard.ready_allowed !== false) {
    throw new ContractError(`${context}: blocked evidence cannot be ready`);
  }
  assertStaleEvidenceCarryoverBoundaryPolicy(guard.boundary_policy, context);
}

export function assertFixtureEvidenceSeparationSafe(
  summary,
  context = "fixture evidence separation"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !FIXTURE_EVIDENCE_SEPARATION_FIELDS.has(field) ||
      (field !== "boundary_policy" && UNSAFE_FIELD_PATTERN.test(field))
    ) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    summary.schema !== "iris_fixture_evidence_separation_v1" ||
    !isSafeLabel(summary.component) ||
    typeof summary.fixture_pass !== "boolean" ||
    typeof summary.real_fresh_evidence !== "boolean" ||
    typeof summary.priority1_completion_allowed !== "boolean" ||
    !["real_fresh_evidence", "fixture_pass_real_blocked", "blocked"].includes(
      summary.separation_status
    )
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  if (
    summary.priority1_completion_allowed !== summary.real_fresh_evidence ||
    (summary.fixture_pass &&
      !summary.real_fresh_evidence &&
      summary.priority1_completion_allowed)
  ) {
    throw new ContractError(`${context}: fixture pass cannot complete priority1`);
  }
  assertFixtureEvidenceSeparationBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeEvidenceValues(summary, context);
}

export function assertManualEvidenceSafeSummary(
  summary,
  context = "manual evidence safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !MANUAL_EVIDENCE_SAFE_SUMMARY_FIELDS.has(field) ||
      (field !== "boundary_policy" && UNSAFE_FIELD_PATTERN.test(field))
    ) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    summary.schema !== "iris_manual_evidence_safe_summary_v1" ||
    !isSafeLabel(summary.manual_label) ||
    !isSafeLabel(summary.status) ||
    !Number.isInteger(summary.evidence_timestamp_ms) ||
    summary.evidence_timestamp_ms < 0
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  assertManualEvidenceBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeEvidenceValues(summary, context);
}

export function assertRealProbeEvidenceSafeSummary(
  summary,
  context = "real probe evidence safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !REAL_PROBE_EVIDENCE_SAFE_SUMMARY_FIELDS.has(field) ||
      (field !== "boundary_policy" && UNSAFE_FIELD_PATTERN.test(field))
    ) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    summary.schema !== "iris_real_probe_evidence_safe_summary_v1" ||
    !isSafeLabel(summary.component) ||
    !isSafeLabel(summary.status) ||
    !Number.isInteger(summary.evidence_timestamp_ms) ||
    summary.evidence_timestamp_ms < 0 ||
    !Number.isInteger(summary.count) ||
    summary.count < 0
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  assertRealProbeEvidenceBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeEvidenceValues(summary, context);
}

export function assertFreshEvidencePublicSummarySafe(
  summary,
  context = "fresh evidence public summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  for (const field of Object.keys(summary)) {
    if (
      !FRESH_EVIDENCE_PUBLIC_SUMMARY_FIELDS.has(field) ||
      (field !== "boundary_policy" && UNSAFE_FIELD_PATTERN.test(field))
    ) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    summary.schema !== "iris_fresh_evidence_public_summary_v1" ||
    !isSafeLabel(summary.component) ||
    !isSafeLabel(summary.status) ||
    !FRESHNESS_LABELS.has(summary.freshness) ||
    !["clear", "BLOCKED"].includes(summary.blocker)
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  const expectedBlocked = summary.status === "BLOCKED" || summary.freshness !== "fresh";
  if (summary.blocker !== (expectedBlocked ? "BLOCKED" : "clear")) {
    throw new ContractError(`${context}: blocker mismatch`);
  }
  assertFreshEvidencePublicSummaryBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeEvidenceValues(summary, context);
}

export function assertFreshEvidenceFixturePackSafe(
  pack,
  context = "fresh evidence fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack is required`);
  }
  for (const field of Object.keys(pack)) {
    if (
      !FRESH_EVIDENCE_FIXTURE_PACK_FIELDS.has(field) ||
      (field !== "boundary_policy" && UNSAFE_FIELD_PATTERN.test(field))
    ) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    pack.schema !== "iris_fresh_evidence_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 6
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expected = {
    fresh_fixture: ["fresh", "fresh"],
    stale_fixture: ["stale", "stale"],
    fixture_source_fixture: ["fixture_source", "runtime_waiting"],
    manual_fixture: ["manual", "manual"],
    leak_reject_fixture: ["leak_reject", "ContractError"],
    schema_violation_fixture: ["schema_violation", "ContractError"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    assertFreshEvidenceFixtureResultSafe(pack[field], context);
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertFreshEvidenceFixturePackBoundaryPolicy(pack.boundary_policy, context);
  assertNoUnsafeEvidenceValues(pack, context);
}

function assertFreshEvidenceComponentSummarySafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: component summary required`);
  }
  for (const field of Object.keys(item)) {
    if (!FRESH_EVIDENCE_COMPONENT_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component field`, { field });
    }
  }
  if (
    item.schema !== "iris_fresh_evidence_component_summary_v1" ||
    !isSafeLabel(item.component) ||
    !isSafeLabel(item.status) ||
    !FRESHNESS_LABELS.has(item.freshness) ||
    !["clear", "BLOCKED"].includes(item.blocker_status)
  ) {
    throw new ContractError(`${context}: invalid component summary`);
  }
  const expectedBlocked = item.status === "BLOCKED" || item.freshness !== "fresh";
  if (item.blocker_status !== (expectedBlocked ? "BLOCKED" : "clear")) {
    throw new ContractError(`${context}: component blocker mismatch`);
  }
}

function assertFreshEvidenceAggregateBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!FRESH_EVIDENCE_AGGREGATE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of FRESH_EVIDENCE_AGGREGATE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertStaleEvidenceCarryoverBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!STALE_EVIDENCE_CARRYOVER_GUARD_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of STALE_EVIDENCE_CARRYOVER_GUARD_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertFixtureEvidenceSeparationBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!FIXTURE_EVIDENCE_SEPARATION_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of FIXTURE_EVIDENCE_SEPARATION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertManualEvidenceBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!MANUAL_EVIDENCE_SAFE_SUMMARY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of MANUAL_EVIDENCE_SAFE_SUMMARY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertRealProbeEvidenceBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!REAL_PROBE_EVIDENCE_SAFE_SUMMARY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of REAL_PROBE_EVIDENCE_SAFE_SUMMARY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertFreshEvidencePublicSummaryBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!FRESH_EVIDENCE_PUBLIC_SUMMARY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of FRESH_EVIDENCE_PUBLIC_SUMMARY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertFreshEvidenceFixtureResultSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: fixture result required`);
  }
  for (const field of Object.keys(item)) {
    if (!FRESH_EVIDENCE_FIXTURE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture result field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_fresh_evidence_fixture_result_v1" ||
    !isSafeLabel(item.fixture_label) ||
    !isSafeLabel(item.fixture_status)
  ) {
    throw new ContractError(`${context}: invalid fixture result`);
  }
}

function assertFreshEvidenceFixturePackBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!FRESH_EVIDENCE_FIXTURE_PACK_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
  }
  for (const field of FRESH_EVIDENCE_FIXTURE_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function normalizeTimestampMs(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function normalizePositiveMs(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.trunc(number);
}

function normalizeNonNegativeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function safeLabel(value, maxLength) {
  return String(value ?? "unknown")
    .replace(/[^a-z0-9_.:-]+/giu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, maxLength) || "unknown";
}

function isSafeLabel(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 80 &&
    !UNSAFE_VALUE_PATTERN.test(value)
  );
}

function assertNoUnsafeEvidenceValues(value, context) {
  const serialized = JSON.stringify(value);
  if (UNSAFE_VALUE_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe evidence value`);
  }
}

function redactFreshEvidenceValue(value) {
  if (Array.isArray(value)) return value.map((item) => redactFreshEvidenceValue(item));
  if (!value || typeof value !== "object") {
    return typeof value === "string" && FRESH_EVIDENCE_REDACT_VALUE_PATTERN.test(value)
      ? "[redacted]"
      : value;
  }
  const result = {};
  for (const [field, fieldValue] of Object.entries(value)) {
    if (FRESH_EVIDENCE_REDACT_FIELD_PATTERN.test(field)) continue;
    result[field] = redactFreshEvidenceValue(fieldValue);
  }
  return result;
}

function assertNoUnsafeFreshEvidenceRedactionValues(value, context) {
  const serialized = JSON.stringify(value);
  if (
    FRESH_EVIDENCE_REDACT_FIELD_PATTERN.test(serialized) ||
    FRESH_EVIDENCE_REDACT_VALUE_PATTERN.test(serialized)
  ) {
    throw new ContractError(`${context}: unsafe value remains`);
  }
}

function createFixtureResult(fixtureLabel, fixtureStatus) {
  return {
    schema: "iris_fresh_evidence_fixture_result_v1",
    fixture_label: safeLabel(fixtureLabel, 80),
    fixture_status: safeLabel(fixtureStatus, 80),
  };
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
