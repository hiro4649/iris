import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { assertApprovedGameInputActionSafe } from "../../services/game/gameActionValidator.js";

const GAME_CONTROL_ADAPTERS = new Set(["mock_game_control", "http_game_control"]);
const CONTROL_STATUSES = new Set([
  "accepted",
  "disabled",
  "not_created",
  "rejected",
  "failed",
]);
const FORBIDDEN_CONTROL_RESULT_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
]);
const UNSAFE_PUBLIC_CONTROL_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url)\b|https?:\/\//i;

export function sendApprovedGameActionToMockAdapter(approvedAction) {
  assertApprovedGameInputActionSafe(approvedAction, "Mock game control adapter input");
  const result = {
    schema: "iris_game_control_result_v1",
    adapter: "mock_game_control",
    trace_id: approvedAction.trace_id,
    event_id: approvedAction.event_id,
    accepted: true,
    executed: false,
    simulated: true,
    control_status: "accepted",
    action_kind: approvedAction.action_kind,
    game_title: approvedAction.game_title,
    adapter_target_hint: approvedAction.adapter_target_hint,
    reason: "mock_adapter_accepts_approved_schema_only",
  };
  assertGameControlResultSafe(result);
  return result;
}

sendApprovedGameActionToMockAdapter.adapterKind = "mock_game_control";

export function createSkippedGameControlResult({
  gameActionValidation,
  reason = null,
} = {}) {
  const result = {
    schema: "iris_game_control_result_v1",
    adapter: "mock_game_control",
    trace_id: gameActionValidation?.trace_id ?? null,
    event_id: gameActionValidation?.event_id ?? null,
    accepted: false,
    executed: false,
    simulated: true,
    control_status: normalizeSkippedStatus(gameActionValidation?.validation_status),
    action_kind: null,
    game_title: null,
    adapter_target_hint: null,
    reason: reason ?? skippedReason(gameActionValidation),
  };
  assertGameControlResultSafe(result);
  return result;
}

export function assertGameControlResultSafe(result, context = "game control result") {
  if (!result || typeof result !== "object") {
    throw new ContractError(`${context}: missing result`);
  }
  assertNoWorldCommand(result, context);
  assertNoForbiddenControlResultFields(result, context);
  if (result.schema !== "iris_game_control_result_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: result.schema });
  }
  if (!GAME_CONTROL_ADAPTERS.has(result.adapter)) {
    throw new ContractError(`${context}: invalid adapter`, { adapter: result.adapter });
  }
  if (!CONTROL_STATUSES.has(result.control_status)) {
    throw new ContractError(`${context}: invalid control status`, {
      control_status: result.control_status,
    });
  }
  if (result.adapter === "mock_game_control" && (result.executed !== false || result.simulated !== true)) {
    throw new ContractError(`${context}: mock adapter must stay simulated`, {
      executed: result.executed,
      simulated: result.simulated,
    });
  }
  if (typeof result.executed !== "boolean" || typeof result.simulated !== "boolean") {
    throw new ContractError(`${context}: result execution flags must be booleans`, {
      executed: result.executed,
      simulated: result.simulated,
    });
  }
}

export function sanitizeGameControlResultForPublicState(result) {
  if (!result) return null;
  assertGameControlResultSafe(result, "Game control public summary");
  return {
    schema: result.schema,
    adapter: safePublicControlText(result.adapter, "unknown_game_control_adapter"),
    trace_id_present: String(result.trace_id ?? "").trim() !== "",
    event_id_present: String(result.event_id ?? "").trim() !== "",
    accepted: result.accepted === true,
    executed: result.executed === true,
    simulated: result.simulated === true,
    control_status: result.control_status,
    action_kind: safeActionKind(result.action_kind),
    game_title: safePublicControlText(result.game_title, "unknown_game"),
    adapter_target_hint: safePublicControlText(result.adapter_target_hint, "target_omitted"),
    error_kind: safePublicControlText(result.error_kind, ""),
    reason: safePublicControlText(result.reason, "game_control_summary_omitted"),
    adapter_response_summary: sanitizeAdapterResponseSummaryForPublicState(
      result.adapter_response_summary
    ),
    boundary_policy: {
      summary_only: true,
      no_platform_ids: true,
      no_action_payloads: true,
      no_candidates: true,
      no_approved_actions: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function normalizeSkippedStatus(validationStatus) {
  if (validationStatus === "disabled") return "disabled";
  if (validationStatus === "not_created") return "not_created";
  return "rejected";
}

function skippedReason(gameActionValidation) {
  if (!gameActionValidation) return "game_action_validation_missing";
  if (gameActionValidation.validation_status === "disabled") return "game_control_disabled";
  if (gameActionValidation.validation_status === "not_created") return "no_approved_game_action";
  return gameActionValidation.rejected_candidates?.[0]?.reason ?? "game_action_rejected";
}

function sanitizeAdapterResponseSummaryForPublicState(summary) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return null;
  return {
    status: safeNumber(summary.status),
    ok: summary.ok === true,
    response_kind: safePublicControlText(summary.response_kind, "omitted"),
    response_omitted: summary.response_omitted === true,
    error_kind: safePublicControlText(summary.error_kind, ""),
    request_id_present: String(summary.request_id ?? "").trim() !== "",
    bridge_status: safePublicControlText(summary.bridge_status, "bridge_status_omitted"),
  };
}

function safePublicControlText(value, fallback, maxLength = 160) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  if (!text) return fallback;
  if (UNSAFE_PUBLIC_CONTROL_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

function safeActionKind(value) {
  const actionKind = String(value ?? "");
  if (["wait", "move_axis", "press_key", "click", "open_menu", "select_item"].includes(actionKind)) {
    return actionKind;
  }
  return null;
}

function safeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(4));
}

function assertNoForbiddenControlResultFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenControlResultFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_CONTROL_RESULT_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: game control result must not expose candidates, commands, or commits`,
        { field, path }
      );
    }
    assertNoForbiddenControlResultFields(child, context, `${path}.${field}`);
  }
}
