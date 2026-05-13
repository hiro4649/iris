import { ContractError } from "../../core/contracts.js";

const REAL_EVIDENCE_INTAKE_FIELDS = new Set([
  "schema",
  "component",
  "status",
  "evidence_timestamp_ms",
  "source_type",
  "collector",
  "status_hash",
  "audit_reference",
]);

const REAL_EVIDENCE_SOURCE_TYPES = new Set([
  "real_probe",
  "operator_confirmed",
  "manual_upload",
  "audit_link",
]);

const REAL_EVIDENCE_DEFAULT_FRESHNESS_THRESHOLD_MS = 30_000;
const REAL_EVIDENCE_COMPONENT_FRESHNESS_THRESHOLDS_MS = new Map([
  ["bridge_worker", 10_000],
  ["tts_engine", 20_000],
  ["live2d_renderer", 20_000],
  ["subtitle_engine", 20_000],
  ["obs_pickup", 15_000],
  ["db_connection", 60_000],
  ["youtube_ingest", 30_000],
  ["game_adapter", 15_000],
]);

const SAFE_LABEL_PATTERN = /^[a-z0-9_.:-]{1,96}$/u;
const SAFE_HASH_PATTERN = /^[a-f0-9]{16,128}$/u;
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|endpoint|url|token|secret|authorization|credential|password|command|response|candidate)(?:$|_)/iu;
const UNSAFE_VALUE_PATTERN =
  /\b(?:https?:\/\/|endpoint|oauth|token|authorization|bearer|api[_ -]?key|secret|raw[_ -]?(?:payload|command|response)|payload|command|candidate|[a-z]:\\|\/[a-z0-9_.-]+\/)\b/iu;

export function createRealEvidenceIntake({
  component,
  status,
  evidenceTimestampMs,
  sourceType = "real_probe",
  collector = "operator",
  statusHash,
  auditReference = "audit_pending",
} = {}) {
  const intake = {
    schema: "iris_real_evidence_intake_v1",
    component: safeLabel(component),
    status: safeLabel(status),
    evidence_timestamp_ms: normalizeTimestampMs(evidenceTimestampMs),
    source_type: safeRealEvidenceSourceType(sourceType),
    collector: safeLabel(collector),
    status_hash: safeHash(statusHash),
    audit_reference: safeLabel(auditReference),
  };
  assertRealEvidenceIntakeSafe(intake);
  return intake;
}

export function assertRealEvidenceIntakeSafe(
  intake,
  context = "real evidence intake"
) {
  if (!intake || typeof intake !== "object" || Array.isArray(intake)) {
    throw new ContractError(`${context}: intake required`);
  }
  for (const field of Object.keys(intake)) {
    if (!REAL_EVIDENCE_INTAKE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  for (const field of REAL_EVIDENCE_INTAKE_FIELDS) {
    if (!Object.hasOwn(intake, field)) {
      throw new ContractError(`${context}: missing field`, { field });
    }
  }
  if (
    intake.schema !== "iris_real_evidence_intake_v1" ||
    !SAFE_LABEL_PATTERN.test(intake.component) ||
    !SAFE_LABEL_PATTERN.test(intake.status) ||
    !Number.isInteger(intake.evidence_timestamp_ms) ||
    intake.evidence_timestamp_ms < 0 ||
    !REAL_EVIDENCE_SOURCE_TYPES.has(intake.source_type) ||
    !SAFE_LABEL_PATTERN.test(intake.collector) ||
    !SAFE_HASH_PATTERN.test(intake.status_hash) ||
    !SAFE_LABEL_PATTERN.test(intake.audit_reference)
  ) {
    throw new ContractError(`${context}: invalid intake`);
  }
  assertNoUnsafeValues(intake, context);
}

export function classifyRealEvidenceSourceType(sourceType) {
  const source_type = safeLabel(sourceType);
  return {
    source_type,
    allowed: REAL_EVIDENCE_SOURCE_TYPES.has(source_type),
    real_evidence: REAL_EVIDENCE_SOURCE_TYPES.has(source_type),
  };
}

export function classifyRealEvidenceFreshness({
  evidence,
  nowMs = Date.now(),
  componentThresholdsMs = {},
} = {}) {
  assertRealEvidenceIntakeSafe(evidence, "real evidence freshness evidence");
  const checkedAtMs = normalizeTimestampMs(nowMs);
  const thresholdMs = realEvidenceFreshnessThresholdMs(
    evidence.component,
    componentThresholdsMs
  );
  if (evidence.evidence_timestamp_ms === 0 || checkedAtMs === 0) {
    return "runtime_waiting";
  }
  if (evidence.evidence_timestamp_ms > checkedAtMs) {
    return "attention";
  }
  return checkedAtMs - evidence.evidence_timestamp_ms <= thresholdMs
    ? "fresh"
    : "stale";
}

export function createRealEvidenceReadinessDowngrade({
  evidence,
  nowMs = Date.now(),
  componentThresholdsMs = {},
} = {}) {
  assertRealEvidenceIntakeSafe(evidence, "real evidence downgrade evidence");
  const freshness = classifyRealEvidenceFreshness({
    evidence,
    nowMs,
    componentThresholdsMs,
  });
  return {
    schema: "iris_real_evidence_readiness_downgrade_v1",
    component: evidence.component,
    evidence_freshness: freshness,
    readiness_status: freshness === "fresh" ? "ready" : freshness,
    blocked_resolution_allowed: freshness === "fresh",
    production_go_allowed: false,
  };
}

export function assertRealEvidenceReadinessDowngradeSafe(
  downgrade,
  context = "real evidence readiness downgrade"
) {
  if (!downgrade || typeof downgrade !== "object" || Array.isArray(downgrade)) {
    throw new ContractError(`${context}: downgrade required`);
  }
  const fields = new Set([
    "schema",
    "component",
    "evidence_freshness",
    "readiness_status",
    "blocked_resolution_allowed",
    "production_go_allowed",
  ]);
  for (const field of Object.keys(downgrade)) {
    if (!fields.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    downgrade.schema !== "iris_real_evidence_readiness_downgrade_v1" ||
    !SAFE_LABEL_PATTERN.test(downgrade.component) ||
    !["fresh", "stale", "runtime_waiting", "attention"].includes(
      downgrade.evidence_freshness
    ) ||
    !["ready", "stale", "runtime_waiting", "attention"].includes(
      downgrade.readiness_status
    ) ||
    typeof downgrade.blocked_resolution_allowed !== "boolean" ||
    downgrade.production_go_allowed !== false
  ) {
    throw new ContractError(`${context}: invalid downgrade`);
  }
  const isFresh = downgrade.evidence_freshness === "fresh";
  if (
    downgrade.readiness_status !== (isFresh ? "ready" : downgrade.evidence_freshness) ||
    downgrade.blocked_resolution_allowed !== isFresh
  ) {
    throw new ContractError(`${context}: downgrade mismatch`);
  }
  assertNoUnsafeValues(downgrade, context);
}

export function createRealEvidenceMissingComponentBlocker({
  requiredComponents = [],
  evidence = [],
} = {}) {
  const safeRequiredComponents = [...new Set(
    (Array.isArray(requiredComponents) ? requiredComponents : [])
      .map((component) => safeLabel(component))
      .filter(Boolean)
  )].sort();
  const presentComponents = new Set(
    (Array.isArray(evidence) ? evidence : []).map((item) => {
      assertRealEvidenceIntakeSafe(item, "real evidence missing component item");
      return item.component;
    })
  );
  const missingComponents = safeRequiredComponents.filter(
    (component) => !presentComponents.has(component)
  );
  const blocker = {
    schema: "iris_real_evidence_missing_component_blocker_v1",
    blocker_status: missingComponents.length > 0 ? "BLOCKED" : "clear",
    required_component_count: safeRequiredComponents.length,
    missing_component_count: missingComponents.length,
    missing_components: missingComponents,
    production_go_allowed: missingComponents.length === 0,
  };
  assertRealEvidenceMissingComponentBlockerSafe(blocker);
  return blocker;
}

export function assertRealEvidenceMissingComponentBlockerSafe(
  blocker,
  context = "real evidence missing component blocker"
) {
  if (!blocker || typeof blocker !== "object" || Array.isArray(blocker)) {
    throw new ContractError(`${context}: blocker required`);
  }
  const fields = new Set([
    "schema",
    "blocker_status",
    "required_component_count",
    "missing_component_count",
    "missing_components",
    "production_go_allowed",
  ]);
  for (const field of Object.keys(blocker)) {
    if (!fields.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    blocker.schema !== "iris_real_evidence_missing_component_blocker_v1" ||
    !["BLOCKED", "clear"].includes(blocker.blocker_status) ||
    !Number.isInteger(blocker.required_component_count) ||
    !Number.isInteger(blocker.missing_component_count) ||
    blocker.required_component_count < 0 ||
    blocker.missing_component_count < 0 ||
    !Array.isArray(blocker.missing_components) ||
    typeof blocker.production_go_allowed !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid blocker`);
  }
  for (const component of blocker.missing_components) {
    if (!SAFE_LABEL_PATTERN.test(component)) {
      throw new ContractError(`${context}: invalid missing component`);
    }
  }
  if (
    blocker.missing_component_count !== blocker.missing_components.length ||
    blocker.blocker_status !==
      (blocker.missing_component_count > 0 ? "BLOCKED" : "clear") ||
    blocker.production_go_allowed !== (blocker.missing_component_count === 0)
  ) {
    throw new ContractError(`${context}: blocker mismatch`);
  }
  assertNoUnsafeValues(blocker, context);
}

export function scanRealEvidenceBodyForUnsafeValues(body) {
  assertNoUnsafeValues(body, "real evidence body scan");
  return {
    schema: "iris_real_evidence_body_scan_v1",
    scan_status: "accepted",
    unsafe_value_detected: false,
  };
}

export function assertRealEvidenceBodyScanSafe(
  scan,
  context = "real evidence body scan"
) {
  if (!scan || typeof scan !== "object" || Array.isArray(scan)) {
    throw new ContractError(`${context}: scan required`);
  }
  const fields = new Set(["schema", "scan_status", "unsafe_value_detected"]);
  for (const field of Object.keys(scan)) {
    if (!fields.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    scan.schema !== "iris_real_evidence_body_scan_v1" ||
    scan.scan_status !== "accepted" ||
    scan.unsafe_value_detected !== false
  ) {
    throw new ContractError(`${context}: invalid scan`);
  }
  assertNoUnsafeValues(scan, context);
}

export function createRealEvidenceHashSummary({
  evidence = [],
  summaryStatus = "accepted",
} = {}) {
  const items = (Array.isArray(evidence) ? evidence : []).map((item) => {
    assertRealEvidenceIntakeSafe(item, "real evidence hash summary item");
    return {
      component: item.component,
      status: item.status,
      source_type: item.source_type,
      collector: item.collector,
      status_hash: item.status_hash,
    };
  });
  const summary = {
    schema: "iris_real_evidence_hash_summary_v1",
    summary_status: safeLabel(summaryStatus),
    evidence_count: items.length,
    items,
  };
  assertRealEvidenceHashSummarySafe(summary);
  return summary;
}

export function assertRealEvidenceHashSummarySafe(
  summary,
  context = "real evidence hash summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  const fields = new Set(["schema", "summary_status", "evidence_count", "items"]);
  for (const field of Object.keys(summary)) {
    if (!fields.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    summary.schema !== "iris_real_evidence_hash_summary_v1" ||
    !SAFE_LABEL_PATTERN.test(summary.summary_status) ||
    !Number.isInteger(summary.evidence_count) ||
    summary.evidence_count < 0 ||
    !Array.isArray(summary.items) ||
    summary.evidence_count !== summary.items.length
  ) {
    throw new ContractError(`${context}: invalid summary`);
  }
  const itemFields = new Set([
    "component",
    "status",
    "source_type",
    "collector",
    "status_hash",
  ]);
  for (const item of summary.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ContractError(`${context}: item required`);
    }
    for (const field of Object.keys(item)) {
      if (!itemFields.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
        throw new ContractError(`${context}: unexpected or unsafe item field`, {
          field,
        });
      }
    }
    if (
      !SAFE_LABEL_PATTERN.test(item.component) ||
      !SAFE_LABEL_PATTERN.test(item.status) ||
      !REAL_EVIDENCE_SOURCE_TYPES.has(item.source_type) ||
      !SAFE_LABEL_PATTERN.test(item.collector) ||
      !SAFE_HASH_PATTERN.test(item.status_hash)
    ) {
      throw new ContractError(`${context}: invalid item`);
    }
  }
  assertNoUnsafeValues(summary, context);
}

export function createRealEvidenceAuditReferenceGate({
  evidence,
  auditEntries = [],
} = {}) {
  assertRealEvidenceIntakeSafe(evidence, "real evidence audit reference evidence");
  const safeAuditEntries = new Set(
    (Array.isArray(auditEntries) ? auditEntries : [])
      .map((entry) => safeLabel(entry))
      .filter((entry) => entry !== "unknown")
  );
  const auditReferenceStatus = safeAuditEntries.has(evidence.audit_reference)
    ? "linked"
    : "missing";
  const gate = {
    schema: "iris_real_evidence_audit_reference_gate_v1",
    component: evidence.component,
    audit_reference: evidence.audit_reference,
    audit_reference_status: auditReferenceStatus,
    production_go_allowed: auditReferenceStatus === "linked",
  };
  assertRealEvidenceAuditReferenceGateSafe(gate);
  return gate;
}

export function assertRealEvidenceAuditReferenceGateSafe(
  gate,
  context = "real evidence audit reference gate"
) {
  if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
    throw new ContractError(`${context}: gate required`);
  }
  const fields = new Set([
    "schema",
    "component",
    "audit_reference",
    "audit_reference_status",
    "production_go_allowed",
  ]);
  for (const field of Object.keys(gate)) {
    if (!fields.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    gate.schema !== "iris_real_evidence_audit_reference_gate_v1" ||
    !SAFE_LABEL_PATTERN.test(gate.component) ||
    !SAFE_LABEL_PATTERN.test(gate.audit_reference) ||
    !["linked", "missing"].includes(gate.audit_reference_status) ||
    gate.production_go_allowed !== (gate.audit_reference_status === "linked")
  ) {
    throw new ContractError(`${context}: invalid gate`);
  }
  assertNoUnsafeValues(gate, context);
}

export function createRealEvidenceFixturePack({
  nowMs = 100_000,
  componentThresholdsMs = { bridge_worker: 10_000 },
} = {}) {
  const freshEvidence = createRealEvidenceIntake({
    component: "bridge_worker",
    status: "ready",
    evidenceTimestampMs: nowMs - 1_000,
    sourceType: "real_probe",
    collector: "local_probe",
    statusHash: "abcdef0123456789",
    auditReference: "audit_entry_001",
  });
  const staleEvidence = createRealEvidenceIntake({
    component: "bridge_worker",
    status: "ready",
    evidenceTimestampMs: nowMs - 20_000,
    sourceType: "real_probe",
    collector: "local_probe",
    statusHash: "1234567890abcdef",
    auditReference: "audit_entry_002",
  });
  const missing = createRealEvidenceMissingComponentBlocker({
    requiredComponents: ["bridge_worker", "tts_engine"],
    evidence: [freshEvidence],
  });
  const fixtureAsRealRejected = throwsContractError(() =>
    createRealEvidenceIntake({
      component: "bridge_worker",
      status: "ready",
      evidenceTimestampMs: nowMs,
      sourceType: "fixture",
      collector: "fixture_pack",
      statusHash: "fedcba0987654321",
      auditReference: "audit_entry_003",
    })
  );
  const unsafeValueRejected = throwsContractError(() =>
    scanRealEvidenceBodyForUnsafeValues({ status: "token abc" })
  );
  const schemaViolationRejected = throwsContractError(() =>
    assertRealEvidenceIntakeSafe({
      ...freshEvidence,
      unexpected_field: "value",
    })
  );
  const pack = {
    schema: "iris_real_evidence_fixture_pack_v1",
    pack_status:
      classifyRealEvidenceFreshness({
        evidence: freshEvidence,
        nowMs,
        componentThresholdsMs,
      }) === "fresh" &&
      ["stale", "runtime_waiting", "attention"].includes(
        classifyRealEvidenceFreshness({
          evidence: staleEvidence,
          nowMs,
          componentThresholdsMs,
        })
      ) &&
      missing.blocker_status === "BLOCKED" &&
      fixtureAsRealRejected &&
      unsafeValueRejected &&
      schemaViolationRejected
        ? "pass"
        : "fail",
    fixture_count: 6,
    fresh_status: classifyRealEvidenceFreshness({
      evidence: freshEvidence,
      nowMs,
      componentThresholdsMs,
    }),
    stale_status: classifyRealEvidenceFreshness({
      evidence: staleEvidence,
      nowMs,
      componentThresholdsMs,
    }),
    missing_status: missing.blocker_status,
    fixture_as_real_status: fixtureAsRealRejected ? "rejected" : "accepted",
    unsafe_value_status: unsafeValueRejected ? "rejected" : "accepted",
    schema_violation_status: schemaViolationRejected ? "rejected" : "accepted",
  };
  assertRealEvidenceFixturePackSafe(pack);
  return pack;
}

export function assertRealEvidenceFixturePackSafe(
  pack,
  context = "real evidence fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  const fields = new Set([
    "schema",
    "pack_status",
    "fixture_count",
    "fresh_status",
    "stale_status",
    "missing_status",
    "fixture_as_real_status",
    "unsafe_value_status",
    "schema_violation_status",
  ]);
  for (const field of Object.keys(pack)) {
    if (!fields.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected or unsafe field`, { field });
    }
  }
  if (
    pack.schema !== "iris_real_evidence_fixture_pack_v1" ||
    !["pass", "fail"].includes(pack.pack_status) ||
    pack.fixture_count !== 6 ||
    pack.fresh_status !== "fresh" ||
    !["stale", "runtime_waiting", "attention"].includes(pack.stale_status) ||
    pack.missing_status !== "BLOCKED" ||
    pack.fixture_as_real_status !== "rejected" ||
    pack.unsafe_value_status !== "rejected" ||
    pack.schema_violation_status !== "rejected"
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  if (pack.pack_status !== "pass") {
    throw new ContractError(`${context}: fixture pack failed`);
  }
  assertNoUnsafeValues(pack, context);
}

export function realEvidenceFreshnessThresholdMs(
  component,
  componentThresholdsMs = {}
) {
  const safeComponent = safeLabel(component);
  const override = componentThresholdsMs?.[safeComponent];
  if (override !== undefined) {
    return normalizePositiveMs(
      override,
      REAL_EVIDENCE_DEFAULT_FRESHNESS_THRESHOLD_MS
    );
  }
  return (
    REAL_EVIDENCE_COMPONENT_FRESHNESS_THRESHOLDS_MS.get(safeComponent) ??
    REAL_EVIDENCE_DEFAULT_FRESHNESS_THRESHOLD_MS
  );
}

function safeLabel(value) {
  return String(value ?? "unknown")
    .replace(/[^a-z0-9_.:-]+/giu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 96) || "unknown";
}

function safeRealEvidenceSourceType(value) {
  const sourceType = safeLabel(value);
  if (!REAL_EVIDENCE_SOURCE_TYPES.has(sourceType)) {
    throw new ContractError("real evidence intake: source_type not allowed");
  }
  return sourceType;
}

function safeHash(value) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-f0-9]/gu, "")
    .slice(0, 128);
  return SAFE_HASH_PATTERN.test(normalized) ? normalized : "0".repeat(16);
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

function throwsContractError(fn) {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof ContractError;
  }
}

function assertNoUnsafeValues(value, context) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item) => assertNoUnsafeValues(item, context));
    return;
  }
  if (typeof value === "object") {
    for (const [field, fieldValue] of Object.entries(value)) {
      if (UNSAFE_FIELD_PATTERN.test(field)) {
        throw new ContractError(`${context}: unsafe field`, { field });
      }
      assertNoUnsafeValues(fieldValue, context);
    }
    return;
  }
  if (typeof value === "string" && UNSAFE_VALUE_PATTERN.test(value)) {
    throw new ContractError(`${context}: unsafe value`);
  }
}
