import { ContractError } from "../../core/contracts.js";
import {
  createApprovedOperatorPolicyRecord,
  sanitizeOperatorPolicyRecordForPublicState,
} from "../persistence/operatorPolicyStore.js";

const SCHEMA = "iris_operator_policy_admin_apply_plan_v1";

const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "event_id",
  "trace_id",
  "subtitle_text",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_candidate",
  "relationship_candidate",
  "relationship_update_candidate",
  "candidate",
  "command",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
  "authorization",
  "viewer_id",
  "display_name",
  "message_text",
  "support_message_text",
  "raw_frame",
  "ocr_text",
  "policy_config",
]);

const UNSAFE_TEXT_PATTERN =
  /\b(world_command|input_action|approved_game_input_action|execute|commit|write|apply|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|raw[_-]?frame|ocr[_-]?text|candidate|command)\b|https?:\/\//i;
const OPERATOR_POLICY_ADMIN_APPLY_PLAN_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "dry_run",
  "apply_status",
  "setting_id",
  "setting_group",
  "policy_version",
  "owner_confirmation_required",
  "owner_confirmation_seen",
  "store_write_performed",
  "postgres_write_performed",
  "public_policy_summary",
  "blocked_reason",
  "next_operator_action",
  "boundary_policy",
]);

export function createOperatorPolicyAdminApplyPlan({
  body = {},
  generatedAtMs = Date.now(),
} = {}) {
  const dryRun = body?.dry_run !== false;
  const confirmation = normalizeConfirmation(body?.operator_confirmation);
  const settingGroup = sanitizeSettingGroup(body?.setting_group);
  const ownerConfirmationRequired = settingGroup === "gameplay_control";
  const ownerConfirmed = confirmation === "owner_confirmed";
  const canCreateRecord = dryRun === true && (!ownerConfirmationRequired || ownerConfirmed);

  let publicSummary = null;
  let validationStatus = "blocked_before_policy_record_creation";
  if (canCreateRecord) {
    const record = createApprovedOperatorPolicyRecord({
      settingId: body?.setting_id,
      settingGroup,
      policyVersion: body?.policy_version ?? "v1",
      policyConfig: body?.policy_config,
      summaryLabel: body?.summary_label ?? "operator policy dry run validated",
      approvedByOperator: true,
      committedAtMs: generatedAtMs,
    });
    publicSummary = sanitizeOperatorPolicyRecordForPublicState(record);
    validationStatus = "validated_for_operator_review";
  }

  const plan = {
    schema: SCHEMA,
    generated_at_ms: generatedAtMs,
    dry_run: true,
    apply_status: validationStatus,
    setting_id: sanitizePolicyId(body?.setting_id),
    setting_group: settingGroup,
    policy_version: sanitizePolicyId(body?.policy_version ?? "v1"),
    owner_confirmation_required: ownerConfirmationRequired,
    owner_confirmation_seen: ownerConfirmed,
    store_write_performed: false,
    postgres_write_performed: false,
    public_policy_summary: publicSummary,
    blocked_reason:
      validationStatus === "validated_for_operator_review"
        ? null
        : ownerConfirmationRequired
          ? "owner_confirmation_required"
          : "dry_run_required",
    next_operator_action:
      validationStatus === "validated_for_operator_review"
        ? "review_public_summary_then_use_authenticated_admin_save"
        : "provide_owner_confirmation_for_sensitive_policy",
    boundary_policy: {
      dry_run_only: true,
      no_store_write: true,
      no_postgres_write: true,
      no_policy_payloads: true,
      no_policy_numeric_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_viewer_messages: true,
      no_support_message_text: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_game_or_os_input: true,
    },
  };
  assertOperatorPolicyAdminApplyPlanSafe(plan);
  return plan;
}

export function assertOperatorPolicyAdminApplyPlanSafe(
  plan,
  context = "operator policy admin apply plan"
) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new ContractError(`${context}: plan must be an object`);
  }
  if (plan.schema !== SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(plan)) {
    if (!OPERATOR_POLICY_ADMIN_APPLY_PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected apply plan field ${field}`);
    }
  }
  if (plan.dry_run !== true || plan.store_write_performed !== false) {
    throw new ContractError(`${context}: plan must remain dry-run`);
  }
  assertBoundaryPolicy(plan.boundary_policy, [
    "dry_run_only",
    "no_store_write",
    "no_postgres_write",
    "no_policy_payloads",
    "no_policy_numeric_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_viewer_messages",
    "no_support_message_text",
    "no_hidden_relationship_scores",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_game_or_os_input",
  ], context);
  assertNoForbiddenShape(plan, context);
  assertNoUnsafeText(plan, context);
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy ${field} must be true`);
    }
  }
}

function normalizeConfirmation(value) {
  return String(value ?? "").trim() === "owner_confirmed" ? "owner_confirmed" : "missing";
}

function sanitizePolicyId(value) {
  const text = String(value ?? "").trim();
  if (!/^[a-z0-9][a-z0-9_-]{1,80}$/i.test(text)) {
    throw new ContractError("unsafe operator policy id");
  }
  return text;
}

function sanitizeSettingGroup(value) {
  const text = sanitizePolicyId(value);
  if (
    ![
      "relationship_delta",
      "memory_retention",
      "gameplay_skill",
      "gameplay_control",
    ].includes(text)
  ) {
    throw new ContractError("unsupported operator policy setting group");
  }
  return text;
}

function assertNoForbiddenShape(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenShape(item, context, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(key)) {
      throw new ContractError(`${context}: forbidden field ${path}.${key}`);
    }
    assertNoForbiddenShape(child, context, `${path}.${key}`);
  }
}

function assertNoUnsafeText(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe text at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeText(item, context, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertNoUnsafeText(child, context, `${path}.${key}`);
  }
}
