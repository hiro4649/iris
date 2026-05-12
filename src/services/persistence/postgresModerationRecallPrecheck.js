import { ContractError } from "../../core/contracts.js";

const MODERATION_STATES = new Set(["allowed", "watch", "limited", "muted", "blocked"]);
const SUPPRESSED_STATES = new Set(["limited", "muted", "blocked"]);
const SAFE_FIELDS = new Set([
  "schema",
  "precheck_status",
  "moderation_state",
  "moderation_precheck_required",
  "moderation_precheck_passed",
  "private_recall_allowed",
  "personalized_recall_allowed",
  "safe_recall_mode",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "moderation_precheck_before_recall",
  "suppressed_state_blocks_private_recall",
  "suppressed_state_blocks_personalization",
  "summary_only",
  "no_private_identity_values",
  "no_memory_bodies",
  "no_candidate_payloads",
  "no_command_output",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(private_viewer_id|viewer_id|raw_memory|memory_body|candidate|relationship_update_candidate|world_command|command|commit|endpoint|token)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(private[_-]?viewer[_-]?id|viewer[_-]?id|raw[_-]?memory|memory[_-]?body|candidate|relationship[_-]?update[_-]?candidate|world[_-]?command|command|commit|endpoint|token|postgres:\/\/)\b|https?:\/\//i;

export function createPostgresModerationRecallPrecheck({
  moderationState = "allowed",
} = {}) {
  const state = normalizeModerationState(moderationState);
  const suppressed = SUPPRESSED_STATES.has(state);
  const precheck = {
    schema: "iris_postgres_moderation_recall_precheck_v1",
    precheck_status: suppressed ? "recall_suppressed" : "recall_allowed",
    moderation_state: state,
    moderation_precheck_required: true,
    moderation_precheck_passed: suppressed !== true,
    private_recall_allowed: suppressed !== true,
    personalized_recall_allowed: suppressed !== true,
    safe_recall_mode: suppressed ? "public_or_generic_only" : "bounded_private_summary",
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertPostgresModerationRecallPrecheckSafe(precheck);
  return precheck;
}

export function assertPostgresModerationRecallPrecheckSafe(
  precheck,
  context = "PostgreSQL moderation recall precheck"
) {
  if (!precheck || typeof precheck !== "object" || Array.isArray(precheck)) {
    throw new ContractError(`${context}: precheck required`);
  }
  assertNoUnsafeStringValues(precheck, context);
  if (precheck.schema !== "iris_postgres_moderation_recall_precheck_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(precheck)) {
    if (!SAFE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["recall_allowed", "recall_suppressed"].includes(precheck.precheck_status)) {
    throw new ContractError(`${context}: invalid precheck status`);
  }
  if (!MODERATION_STATES.has(precheck.moderation_state)) {
    throw new ContractError(`${context}: invalid moderation state`);
  }
  if (precheck.moderation_precheck_required !== true) {
    throw new ContractError(`${context}: moderation precheck is required`);
  }
  const suppressed = SUPPRESSED_STATES.has(precheck.moderation_state);
  if (precheck.moderation_precheck_passed !== (suppressed !== true)) {
    throw new ContractError(`${context}: invalid moderation precheck result`);
  }
  if (
    precheck.private_recall_allowed !== (suppressed !== true) ||
    precheck.personalized_recall_allowed !== (suppressed !== true)
  ) {
    throw new ContractError(`${context}: suppressed moderation must block recall`);
  }
  if (
    suppressed &&
    precheck.safe_recall_mode !== "public_or_generic_only"
  ) {
    throw new ContractError(`${context}: suppressed moderation requires generic recall mode`);
  }
  if (
    !suppressed &&
    precheck.safe_recall_mode !== "bounded_private_summary"
  ) {
    throw new ContractError(`${context}: allowed moderation requires bounded recall mode`);
  }
  assertBoundaryPolicy(precheck.boundary_policy, context);
}

function normalizeModerationState(value) {
  const state = String(value ?? "").trim();
  return MODERATION_STATES.has(state) ? state : "watch";
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(BOUNDARY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoUnsafeStringValues(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe recall precheck value exposed`, {
        path,
      });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeStringValues(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeStringValues(child, context, `${path}.${field}`);
  }
}
