import { ContractError } from "../../core/contracts.js";

export const STORE_STATUS_ERROR_KINDS = new Set([
  "store_parse_failed",
  "store_contract_failed",
  "store_permission_failed",
  "store_capacity_failed",
  "store_location_unavailable",
  "store_unavailable",
]);

export function classifyStoreReadError(error) {
  if (error instanceof SyntaxError) return "store_parse_failed";
  if (error instanceof ContractError) return "store_contract_failed";
  const code = typeof error?.code === "string" ? error.code : "";
  if (["EACCES", "EPERM", "EROFS"].includes(code)) return "store_permission_failed";
  if (["ENOSPC", "EDQUOT"].includes(code)) return "store_capacity_failed";
  if (["ENOENT", "ENOTDIR"].includes(code)) return "store_location_unavailable";
  return "store_unavailable";
}

export function sanitizeStoreErrorKind(errorKind) {
  if (!errorKind) return null;
  return STORE_STATUS_ERROR_KINDS.has(errorKind) ? errorKind : "store_unavailable";
}
