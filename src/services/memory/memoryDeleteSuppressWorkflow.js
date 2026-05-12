import { ContractError } from "../../core/contracts.js";

const WORKFLOW_ACTIONS = new Set(["delete", "suppress"]);
const SAFE_FIELDS = new Set([
  "schema",
  "workflow_action",
  "workflow_status",
  "confirmation_required",
  "confirmation_present",
  "audit_required",
  "audit_present",
  "ordinary_recall_allowed",
  "recall_exclusion_applied",
  "boundary_policy",
]);
const BOUNDARY_FIELDS = [
  "confirmation_required",
  "audit_required",
  "ordinary_recall_excluded",
  "no_direct_store_mutation",
  "no_source_body_export",
  "no_execution_command",
];
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_memory|memory_body|memory_candidate|selected_memory_ids|execute|commit|write|apply|world_command|input_action_candidate)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?memory|memory[_-]?body|memory[_-]?candidate|selected[_-]?memory[_-]?ids|execute|commit|write|apply|world[_-]?command|input[_-]?action[_-]?candidate)\b/i;

export function createMemoryDeleteSuppressWorkflow({
  action = "suppress",
  confirmation = false,
  auditEntry = null,
} = {}) {
  const workflowAction = normalizeAction(action);
  const confirmationPresent = confirmation === true;
  const auditPresent = isSafeAuditEntry(auditEntry);
  const ready = confirmationPresent === true && auditPresent === true;
  const workflow = {
    schema: "iris_memory_delete_suppress_workflow_v1",
    workflow_action: workflowAction,
    workflow_status: ready ? "ready_for_persistence_pipeline" : "confirmation_or_audit_required",
    confirmation_required: true,
    confirmation_present: confirmationPresent,
    audit_required: true,
    audit_present: auditPresent,
    ordinary_recall_allowed: false,
    recall_exclusion_applied: true,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertMemoryDeleteSuppressWorkflowSafe(workflow);
  return workflow;
}

export function assertMemoryDeleteSuppressWorkflowSafe(
  workflow,
  context = "memory delete suppress workflow"
) {
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
    throw new ContractError(`${context}: workflow required`);
  }
  assertNoUnsafeStringValues(workflow, context);
  if (workflow.schema !== "iris_memory_delete_suppress_workflow_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(workflow)) {
    if (!SAFE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!WORKFLOW_ACTIONS.has(workflow.workflow_action)) {
    throw new ContractError(`${context}: invalid workflow action`);
  }
  if (
    !["ready_for_persistence_pipeline", "confirmation_or_audit_required"].includes(
      workflow.workflow_status
    )
  ) {
    throw new ContractError(`${context}: invalid workflow status`);
  }
  for (const field of [
    "confirmation_required",
    "confirmation_present",
    "audit_required",
    "audit_present",
    "ordinary_recall_allowed",
    "recall_exclusion_applied",
  ]) {
    if (typeof workflow[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (workflow.confirmation_required !== true || workflow.audit_required !== true) {
    throw new ContractError(`${context}: confirmation and audit are required`);
  }
  if (workflow.ordinary_recall_allowed !== false || workflow.recall_exclusion_applied !== true) {
    throw new ContractError(`${context}: ordinary recall must be excluded`);
  }
  const ready = workflow.confirmation_present === true && workflow.audit_present === true;
  if (
    workflow.workflow_status !==
    (ready ? "ready_for_persistence_pipeline" : "confirmation_or_audit_required")
  ) {
    throw new ContractError(`${context}: workflow status mismatch`);
  }
  assertBoundaryPolicy(workflow.boundary_policy, context);
}

function normalizeAction(value) {
  const action = String(value ?? "").trim().toLowerCase();
  return WORKFLOW_ACTIONS.has(action) ? action : "suppress";
}

function isSafeAuditEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    value.schema === "iris_admin_audit_trail_safe_entry_v1" ||
    value.schema === "iris_operator_policy_audit_entry_v1" ||
    value.audit_present === true
  );
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
      throw new ContractError(`${context}: unsafe workflow value`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  const allowedKeys = new Set([...SAFE_FIELDS, ...BOUNDARY_FIELDS]);
  for (const [key, nested] of Object.entries(value)) {
    if (!allowedKeys.has(key) && UNSAFE_FIELD_PATTERN.test(key)) {
      throw new ContractError(`${context}: unsafe workflow field`, {
        path: `${path}.${key}`,
      });
    }
    assertNoUnsafeStringValues(nested, context, `${path}.${key}`);
  }
}
