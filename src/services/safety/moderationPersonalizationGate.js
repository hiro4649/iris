import { ContractError } from "../../core/contracts.js";

const MODERATION_STATUSES = new Set(["allowed", "watch", "limited", "muted", "blocked", "bounded"]);
const SUPPRESSION_STATUSES = new Set(["limited", "muted", "blocked", "bounded"]);
const SAFE_GATE_FIELDS = new Set([
  "schema",
  "moderation_status",
  "personalized_recall_status",
  "relationship_growth_status",
  "donation_gratitude_status",
  "game_communication_status",
  "suppression_required",
  "boundary_policy",
  "adapter_validation_required",
]);

const FORBIDDEN_GATE_FIELDS = new Set([
  "raw_comment",
  "raw_memory",
  "raw_support",
  "raw_payload",
  "candidate",
  "relationship_update_candidate",
  "memory_candidate",
  "input_action_candidate",
  "world_command",
  "command",
  "endpoint",
  "token",
  "secret",
]);

export function createModerationPersonalizationE2ESummary({ moderationStatus = "allowed" } = {}) {
  const status = normalizeModerationStatus(moderationStatus);
  const suppressionRequired = SUPPRESSION_STATUSES.has(status);
  const summary = {
    schema: "iris_moderation_personalization_e2e_summary_v1",
    moderation_status: status,
    personalized_recall_status: suppressionRequired ? "suppressed" : "allowed",
    relationship_growth_status: suppressionRequired ? "suppressed" : "allowed",
    donation_gratitude_status: suppressionRequired ? "safe_general_only" : "safe_gratitude_allowed",
    game_communication_status: suppressionRequired ? "safe_distance_only" : "safe_commentary_allowed",
    suppression_required: suppressionRequired,
    boundary_policy: {
      moderation_precheck_required: true,
      recall_suppressed_when_bounded_or_blocked: true,
      relationship_growth_suppressed_when_bounded_or_blocked: true,
      donation_personalization_suppressed_when_bounded_or_blocked: true,
      game_personalization_suppressed_when_bounded_or_blocked: true,
      safe_summary_only: true,
      payload_material_excluded: true,
      validation_material_excluded: true,
      execution_material_excluded: true,
    },
    adapter_validation_required: true,
  };
  assertModerationPersonalizationE2ESummarySafe(summary);
  return summary;
}

export function assertModerationPersonalizationE2ESummarySafe(
  summary,
  context = "moderation personalization E2E summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!SAFE_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_moderation_personalization_e2e_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: summary.schema });
  }
  if (!MODERATION_STATUSES.has(summary.moderation_status)) {
    throw new ContractError(`${context}: invalid moderation status`);
  }
  const suppressionRequired = SUPPRESSION_STATUSES.has(summary.moderation_status);
  if (summary.suppression_required !== suppressionRequired) {
    throw new ContractError(`${context}: suppression flag mismatch`);
  }
  if (suppressionRequired) {
    assertSuppressed(summary, context);
  }
  assertBoundaryPolicySafe(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
  assertNoForbiddenGateMaterial(summary, context);
}

function assertSuppressed(summary, context) {
  if (
    summary.personalized_recall_status !== "suppressed" ||
    summary.relationship_growth_status !== "suppressed" ||
    summary.donation_gratitude_status !== "safe_general_only" ||
    summary.game_communication_status !== "safe_distance_only"
  ) {
    throw new ContractError(`${context}: moderated personalization must be suppressed`);
  }
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy must be an object`);
  }
  for (const value of Object.values(policy)) {
    if (value !== true) {
      throw new ContractError(`${context}: boundary policy flags must be true`);
    }
  }
}

function normalizeModerationStatus(value) {
  const status = String(value ?? "allowed").trim().toLowerCase();
  return MODERATION_STATUSES.has(status) ? status : "blocked";
}

function assertNoForbiddenGateMaterial(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenGateMaterial(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_GATE_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field leaked`, { field, path });
    }
    assertNoForbiddenGateMaterial(child, context, `${path}.${field}`);
  }
}
