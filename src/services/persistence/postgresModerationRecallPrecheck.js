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
const BLOCKLIST_SCHEMA_PREFLIGHT_FIELDS = new Set([
  "schema",
  "preflight_status",
  "moderation_state",
  "reason_code",
  "safe_note_summary",
  "ordinary_view_safe",
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
const BLOCKLIST_BOUNDARY_FIELDS = [
  "moderation_state_required",
  "reason_code_required",
  "safe_note_summary_only",
  "ordinary_view_redacted",
  "no_raw_harassment_text",
  "no_private_notes",
  "no_private_identity_values",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(private_viewer_id|viewer_id|raw_memory|memory_body|raw_harassment_text|harassment_text|private_note|candidate|relationship_update_candidate|world_command|command|commit|endpoint|token)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(private[\s_-]?viewer[\s_-]?id|viewer[\s_-]?id|raw[\s_-]?memory|memory[\s_-]?body|raw[\s_-]?harassment|harassment[\s_-]?text|private[\s_-]?note|candidate|relationship[\s_-]?update[\s_-]?candidate|world[\s_-]?command|command|commit|endpoint|token|postgres:\/\/)\b|https?:\/\//i;

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

export function createPostgresModerationBlocklistSchemaPreflight({
  moderationState = "watch",
  reasonCode = "policy_review",
  safeNoteSummary = "moderation review required",
} = {}) {
  const preflight = {
    schema: "iris_postgres_moderation_blocklist_schema_preflight_v1",
    preflight_status: "schema_ready",
    moderation_state: normalizeModerationState(moderationState),
    reason_code: safeLabel(reasonCode, "policy_review"),
    safe_note_summary: safeSummary(safeNoteSummary, "moderation_review_required"),
    ordinary_view_safe: true,
    boundary_policy: Object.fromEntries(
      BLOCKLIST_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertPostgresModerationBlocklistSchemaPreflightSafe(preflight);
  return preflight;
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

export function assertPostgresModerationBlocklistSchemaPreflightSafe(
  preflight,
  context = "PostgreSQL moderation blocklist schema preflight"
) {
  if (!preflight || typeof preflight !== "object" || Array.isArray(preflight)) {
    throw new ContractError(`${context}: preflight required`);
  }
  assertNoUnsafeStringValues(preflight, context);
  if (preflight.schema !== "iris_postgres_moderation_blocklist_schema_preflight_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(preflight)) {
    if (!BLOCKLIST_SCHEMA_PREFLIGHT_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (preflight.preflight_status !== "schema_ready") {
    throw new ContractError(`${context}: invalid preflight status`);
  }
  if (!MODERATION_STATES.has(preflight.moderation_state)) {
    throw new ContractError(`${context}: invalid moderation state`);
  }
  if (!isSafeLabel(preflight.reason_code)) {
    throw new ContractError(`${context}: invalid reason code`);
  }
  if (
    typeof preflight.safe_note_summary !== "string" ||
    preflight.safe_note_summary.trim() === "" ||
    UNSAFE_TEXT_PATTERN.test(preflight.safe_note_summary)
  ) {
    throw new ContractError(`${context}: invalid safe note summary`);
  }
  if (preflight.ordinary_view_safe !== true) {
    throw new ContractError(`${context}: ordinary view must be safe`);
  }
  assertBlocklistBoundaryPolicy(preflight.boundary_policy, context);
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

function assertBlocklistBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(BLOCKLIST_BOUNDARY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of BLOCKLIST_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function safeLabel(value, fallback) {
  const label = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!isSafeLabel(label)) return fallback;
  return label.slice(0, 80);
}

function isSafeLabel(value) {
  return /^[a-z][a-z0-9_]{0,79}$/.test(String(value ?? "")) &&
    !UNSAFE_TEXT_PATTERN.test(String(value ?? ""));
}

function safeSummary(value, fallback) {
  const text = String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || UNSAFE_TEXT_PATTERN.test(text)) return fallback;
  return text.slice(0, 160);
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
