import { ContractError } from "../../core/contracts.js";

export const IRIS_MEMORY_STATUSES = Object.freeze([
  "candidate",
  "accepted",
  "protected",
  "stale",
  "rejected",
]);

export const IRIS_NATURAL_MEMORY_USE_STATUSES = Object.freeze(["accepted", "protected"]);

const MEMORY_STATUS_SET = new Set(IRIS_MEMORY_STATUSES);
const NATURAL_USE_STATUS_SET = new Set(IRIS_NATURAL_MEMORY_USE_STATUSES);

export function assertIrisMemoryStatus(status, context = "IRIS memory status") {
  if (!MEMORY_STATUS_SET.has(status)) {
    throw new ContractError(`${context}: unsupported status`, {
      status,
      allowed_statuses: IRIS_MEMORY_STATUSES,
    });
  }
}

export function canUseIrisMemoryNaturally(status) {
  assertIrisMemoryStatus(status, "IRIS natural memory use");
  return NATURAL_USE_STATUS_SET.has(status);
}

export function assertIrisMemoryRecordContract(record, context = "IRIS memory record") {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new ContractError(`${context}: record object is required`);
  }
  assertIrisMemoryStatus(record.status, context);
  if (record.status === "protected" && record.protected_change_requires_human_approval !== true) {
    throw new ContractError(`${context}: protected memory requires human approval gate`);
  }
  if (record.status === "candidate" && record.review_required !== true) {
    throw new ContractError(`${context}: candidate memory requires review`);
  }
  if (record.status === "stale" && record.reconfirmation_required !== true) {
    throw new ContractError(`${context}: stale memory requires reconfirmation`);
  }
  if (record.status === "rejected" && record.natural_use_allowed === true) {
    throw new ContractError(`${context}: rejected memory cannot allow natural use`);
  }
  if (Boolean(record.natural_use_allowed) !== canUseIrisMemoryNaturally(record.status)) {
    throw new ContractError(`${context}: natural use flag does not match status`, {
      status: record.status,
    });
  }
}

export function assertProtectedMemoryChangeApproval({
  currentRecord,
  nextRecord,
  humanApproval,
  context = "IRIS protected memory change",
} = {}) {
  assertIrisMemoryRecordContract(currentRecord, `${context}: current`);
  if (nextRecord) {
    assertIrisMemoryRecordContract(nextRecord, `${context}: next`);
  }
  if (currentRecord.status !== "protected") return;
  if (!humanApproval || humanApproval.approved !== true || humanApproval.actor_type !== "human") {
    throw new ContractError(`${context}: protected memory change requires human approval`);
  }
}

export function summarizeIrisMemoryUsePolicy(status) {
  assertIrisMemoryStatus(status, "IRIS memory policy summary");
  return {
    status,
    natural_use_allowed: canUseIrisMemoryNaturally(status),
    review_required: status === "candidate",
    reconfirmation_required: status === "stale",
    human_approval_required_for_change: status === "protected",
  };
}
