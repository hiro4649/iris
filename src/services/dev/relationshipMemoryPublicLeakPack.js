import { ContractError } from "../../core/contracts.js";

const LEAK_PACK_FIELDS = new Set([
  "schema",
  "fixture_count",
  "rejected_fixture_count",
  "pack_status",
  "safe_reason_labels",
  "boundary_policy",
  "adapter_validation_required",
]);
const SAFE_REASON_LABELS = new Set([
  "hidden_score_blocked",
  "internal_stage_blocked",
  "raw_memory_blocked",
  "private_id_blocked",
  "raw_support_blocked",
]);
const FORBIDDEN_PUBLIC_FIELDS = new Set([
  "hidden_score",
  "hidden_rank",
  "relation_score",
  "relationship_score",
  "internal_relationship_stage",
  "raw_memory",
  "raw_memory_body",
  "memory_body",
  "private_id",
  "private_viewer_id",
  "viewer_private_id",
  "linked_identity_id",
  "raw_support",
  "raw_support_message",
  "support_message",
]);
const FORBIDDEN_PUBLIC_TEXT =
  /\b(hidden[_ -]?score|hidden[_ -]?rank|relation[_ -]?score|relationship[_ -]?score|internal[_ -]?relationship[_ -]?stage|raw[_ -]?memory|memory[_ -]?body|private[_ -]?viewer|private[-_ ]?viewer[-_ ][a-z0-9-]+|viewer[_ -]?private[_ -]?id|raw[_ -]?support|support[_ -]?message)\b/i;

export function createRelationshipMemoryPublicLeakPackSummary({
  fixtures = createDefaultRelationshipMemoryPublicLeakFixtures(),
} = {}) {
  const list = Array.isArray(fixtures) ? fixtures : [];
  const rejected = list.map((fixture) => scanRelationshipMemoryPublicSurface(fixture)).filter(Boolean);
  const summary = {
    schema: "iris_relationship_memory_public_leak_pack_v1",
    fixture_count: list.length,
    rejected_fixture_count: rejected.length,
    pack_status: rejected.length === list.length && list.length > 0 ? "failures_detected" : "attention",
    safe_reason_labels: [...new Set(rejected.flatMap((item) => item.safe_reason_labels))],
    boundary_policy: {
      public_surface_scan_only: true,
      hidden_score_blocked: true,
      internal_stage_blocked: true,
      raw_memory_blocked: true,
      private_id_blocked: true,
      raw_support_blocked: true,
      no_raw_fixture_payload: true,
    },
    adapter_validation_required: true,
  };
  assertRelationshipMemoryPublicLeakPackSummarySafe(summary);
  return summary;
}

export function assertRelationshipMemoryPublicLeakPackSummarySafe(
  summary,
  context = "relationship memory public leak pack"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!LEAK_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_relationship_memory_public_leak_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!Number.isInteger(summary.fixture_count) || summary.fixture_count < 1) {
    throw new ContractError(`${context}: invalid fixture count`);
  }
  if (
    !Number.isInteger(summary.rejected_fixture_count) ||
    summary.rejected_fixture_count !== summary.fixture_count
  ) {
    throw new ContractError(`${context}: unsafe fixtures must fail`);
  }
  if (summary.pack_status !== "failures_detected") {
    throw new ContractError(`${context}: invalid pack status`);
  }
  for (const label of summary.safe_reason_labels) {
    if (!SAFE_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid reason label`);
    }
  }
  for (const value of Object.values(summary.boundary_policy ?? {})) {
    if (value !== true) {
      throw new ContractError(`${context}: boundary policy flags must be true`);
    }
  }
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

export function scanRelationshipMemoryPublicSurface(value) {
  const labels = [...scanForbiddenPublicSurface(value)];
  return labels.length > 0 ? { safe_reason_labels: labels } : null;
}

function createDefaultRelationshipMemoryPublicLeakFixtures() {
  return [
    { public_summary: { hidden_score: 0.9 } },
    { public_summary: { internal_relationship_stage: "trusted" } },
    { public_summary: { raw_memory: "raw memory text" } },
    { public_summary: { private_viewer_id: "private-viewer-123" } },
    { public_summary: { raw_support_message: "raw support text" } },
  ];
}

function scanForbiddenPublicSurface(value, labels = new Set()) {
  if (typeof value === "string") {
    addTextLabels(value, labels);
    return labels;
  }
  if (!value || typeof value !== "object") return labels;
  if (Array.isArray(value)) {
    value.forEach((item) => scanForbiddenPublicSurface(item, labels));
    return labels;
  }
  for (const [field, child] of Object.entries(value)) {
    addFieldLabels(field, labels);
    scanForbiddenPublicSurface(child, labels);
  }
  return labels;
}

function addFieldLabels(field, labels) {
  if (!FORBIDDEN_PUBLIC_FIELDS.has(field)) return;
  if (field.includes("score") || field.includes("rank")) labels.add("hidden_score_blocked");
  else if (field.includes("stage")) labels.add("internal_stage_blocked");
  else if (field.includes("memory")) labels.add("raw_memory_blocked");
  else if (field.includes("support")) labels.add("raw_support_blocked");
  else labels.add("private_id_blocked");
}

function addTextLabels(text, labels) {
  if (!FORBIDDEN_PUBLIC_TEXT.test(text)) return;
  const normalized = text.toLowerCase();
  if (/score|rank/.test(normalized)) labels.add("hidden_score_blocked");
  if (/stage/.test(normalized)) labels.add("internal_stage_blocked");
  if (/memory/.test(normalized)) labels.add("raw_memory_blocked");
  if (/support/.test(normalized)) labels.add("raw_support_blocked");
  if (/private|viewer/.test(normalized)) labels.add("private_id_blocked");
}
