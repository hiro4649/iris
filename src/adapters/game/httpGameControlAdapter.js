import { ContractError } from "../../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../../core/localEndpointPolicy.js";
import {
  assertApprovedGameInputActionSafe,
  isApprovedGameInputActionExpired,
} from "../../services/game/gameActionValidator.js";
import { assertGameControlResultSafe } from "./mockGameControlAdapter.js";

const FORBIDDEN_HTTP_CONTROL_RESPONSE_FIELDS = new Set([
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
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
]);
const TEXT_RESPONSE = Symbol("http_game_control_text_response");
const UNSAFE_RESPONSE_SUMMARY_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url)\b|https?:\/\//i;
const UNSAFE_STATUS_SUMMARY_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password)\b|https?:\/\//i;
const GAME_CONTROL_READINESS_STATUSES = new Set(["idle", "active", "attention"]);
const LOCAL_ENDPOINT_POLICY_STATUSES = new Set(["all_allowed", "blocked", "not_configured"]);
const GAME_CONTROL_ENDPOINT_SCOPES = new Set([
  "loopback",
  "private_network",
  "external",
  "invalid",
  "not_configured",
]);
const PUBLIC_STATUS_COUNT_FIELDS = [
  "request_count",
  "accepted_count",
  "failed_count",
  "unsafe_response_count",
  "http_status_failure_count",
  "timeout_count",
  "request_error_count",
  "expired_action_count",
];

export function createHttpGameControlAdapter({
  endpoint,
  apiKey = "",
  timeoutMs = 5000,
  nowMs = () => Date.now(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!endpoint) {
    throw new ContractError("HTTP game control endpoint is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new ContractError("HTTP game control adapter requires fetch");
  }
  const endpointScope = summarizeLocalEndpointScope(endpoint);
  const localEndpointPolicyStatus = summarizeLocalEndpointPolicyStatus(endpointScope);
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);
  const status = createInitialStatus({
    endpointScope,
    localEndpointPolicyStatus,
  });

  async function sendHttpGameControl(approvedAction) {
    assertApprovedGameInputActionSafe(approvedAction, "HTTP game control input");
    status.request_count += 1;
    if (isApprovedGameInputActionExpired(approvedAction, { nowMs })) {
      const result = buildFailedGameControlResult({
        approvedAction,
        status: 0,
        bridgeStatus: "approved_action_expired",
        reason: "http_game_control_approved_action_expired",
        errorKind: "expired_action",
      });
      recordResultStatus(status, result);
      return result;
    }
    if (endpointScope.local_endpoint_allowed !== true) {
      const result = buildFailedGameControlResult({
        approvedAction,
        status: 0,
        bridgeStatus: "local_endpoint_policy_blocked",
        reason: "http_game_control_local_endpoint_policy_blocked",
        errorKind: "local_endpoint_policy_blocked",
      });
      recordResultStatus(status, result);
      return result;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), safeTimeoutMs);
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(approvedAction),
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = buildFailedGameControlResult({
          approvedAction,
          status: response.status,
          bridgeStatus: response.statusText || `http_${response.status}`,
          reason: "http_game_control_request_failed",
        });
        recordResultStatus(status, result);
        return result;
      }
      const responseText = await response.text();
      const parsed = parseMaybeJson(responseText);
      const unsafeResponseResult = rejectUnsafeHttpControlResponse({
        parsed,
        approvedAction,
        status: response.status,
      });
      if (unsafeResponseResult) {
        recordResultStatus(status, unsafeResponseResult);
        return unsafeResponseResult;
      }
      const bridgeStatus =
        parsed && typeof parsed === "object"
          ? parsed.bridge_status ?? parsed.bridgeStatus ?? parsed.control_status ?? parsed.controlStatus ?? ""
          : "";
      const accepted =
        response.ok &&
        parsed?.accepted !== false &&
        parsed?.ok !== false &&
        parsed?.success !== false &&
        !["failed", "rejected", "error"].includes(String(bridgeStatus).toLowerCase());
      const executed =
        response.ok &&
        parsed?.simulated !== true &&
        (parsed?.executed === true ||
          String(bridgeStatus).toLowerCase() === "accepted_executed");
      const result = {
        schema: "iris_game_control_result_v1",
        adapter: "http_game_control",
        trace_id: approvedAction.trace_id,
        trace_id_present: safeText(approvedAction.trace_id) !== "",
        event_id: approvedAction.event_id,
        event_id_present: safeText(approvedAction.event_id) !== "",
        accepted,
        executed,
        simulated: parsed?.simulated === true,
        control_status: accepted ? "accepted" : "failed",
        action_kind: approvedAction.action_kind,
        game_title: approvedAction.game_title,
        adapter_target_hint: approvedAction.adapter_target_hint,
        error_kind: null,
        reason: safePublicResponseText(
          parsed && typeof parsed === "object"
            ? parsed.reason ?? response.statusText ?? `http_${response.status}`
            : response.statusText || `http_${response.status}`,
          "http_game_control_response_summary"
        ),
        adapter_response_summary: {
          status: response.status,
          ok: response.ok,
          response_kind: parsed === TEXT_RESPONSE ? "text" : parsed ? "json" : "empty",
          response_omitted: parsed === TEXT_RESPONSE,
          error_kind: null,
          request_id: safePublicResponseText(
            parsed && typeof parsed === "object" ? parsed.request_id ?? parsed.id ?? "" : "",
            ""
          ),
          bridge_status: safePublicResponseText(
            bridgeStatus || (parsed && typeof parsed === "object" ? parsed.status ?? "" : response.statusText ?? ""),
            "bridge_status_omitted"
          ),
        },
      };
      assertGameControlResultSafe(result, "HTTP game control result");
      recordResultStatus(status, result);
      return result;
    } catch (error) {
      if (error instanceof ContractError) throw error;
      const result = buildFailedGameControlResult({
        approvedAction,
        status: 0,
        bridgeStatus: classifyRequestError(error),
        reason: "http_game_control_request_failed",
        errorKind: classifyRequestError(error),
      });
      recordResultStatus(status, result);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  sendHttpGameControl.adapterKind = "http_game_control";
  sendHttpGameControl.status = () => createPublicStatus(status);
  return sendHttpGameControl;
}

function createInitialStatus({ endpointScope, localEndpointPolicyStatus }) {
  return {
    adapter_kind: "http_game_control",
    request_target_configured: true,
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    game_control_endpoint_scope: endpointScope.endpoint_scope,
    game_control_endpoint_locality_ok: endpointScope.local_endpoint_allowed,
    request_count: 0,
    accepted_count: 0,
    failed_count: 0,
    unsafe_response_count: 0,
    http_status_failure_count: 0,
    timeout_count: 0,
    request_error_count: 0,
    expired_action_count: 0,
    last_control_status: null,
    last_error_kind: null,
    last_action_kind: null,
  };
}

function createPublicStatus(status) {
  const publicStatus = {
    schema: "iris_http_game_control_adapter_status_v1",
    adapter_kind: status.adapter_kind,
    game_control_readiness_status: summarizeGameControlReadiness(status),
    request_target_configured: status.request_target_configured,
    local_endpoint_policy: status.local_endpoint_policy,
    local_endpoint_policy_status: status.local_endpoint_policy_status,
    game_control_endpoint_scope: status.game_control_endpoint_scope,
    game_control_endpoint_locality_ok: status.game_control_endpoint_locality_ok,
    request_count: status.request_count,
    accepted_count: status.accepted_count,
    failed_count: status.failed_count,
    unsafe_response_count: status.unsafe_response_count,
    http_status_failure_count: status.http_status_failure_count,
    timeout_count: status.timeout_count,
    request_error_count: status.request_error_count,
    expired_action_count: status.expired_action_count,
    last_control_status: status.last_control_status,
    last_error_kind: status.last_error_kind,
    last_action_kind: status.last_action_kind,
    boundary_policy: {
      counts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_action_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertHttpGameControlAdapterStatusSafe(publicStatus);
  return publicStatus;
}

export function assertHttpGameControlAdapterStatusSafe(
  status,
  context = "HTTP game control adapter status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  assertNoForbiddenHttpControlResponseFields(status, context);
  if (status.schema !== "iris_http_game_control_adapter_status_v1") {
    throw new ContractError(`${context}: invalid status schema`, { schema: status.schema });
  }
  if (status.adapter_kind !== "http_game_control") {
    throw new ContractError(`${context}: invalid adapter kind`, {
      adapter_kind: status.adapter_kind,
    });
  }
  if (!GAME_CONTROL_READINESS_STATUSES.has(status.game_control_readiness_status)) {
    throw new ContractError(`${context}: invalid readiness status`, {
      game_control_readiness_status: status.game_control_readiness_status,
    });
  }
  if (status.request_target_configured !== true) {
    throw new ContractError(`${context}: request target must be configured`);
  }
  if (status.local_endpoint_policy !== "loopback_or_private_network_only") {
    throw new ContractError(`${context}: invalid local endpoint policy`, {
      local_endpoint_policy: status.local_endpoint_policy,
    });
  }
  if (!LOCAL_ENDPOINT_POLICY_STATUSES.has(status.local_endpoint_policy_status)) {
    throw new ContractError(`${context}: invalid local endpoint policy status`, {
      local_endpoint_policy_status: status.local_endpoint_policy_status,
    });
  }
  if (!GAME_CONTROL_ENDPOINT_SCOPES.has(status.game_control_endpoint_scope)) {
    throw new ContractError(`${context}: invalid endpoint scope`, {
      game_control_endpoint_scope: status.game_control_endpoint_scope,
    });
  }
  if (typeof status.game_control_endpoint_locality_ok !== "boolean") {
    throw new ContractError(`${context}: endpoint locality must be boolean`);
  }
  for (const field of PUBLIC_STATUS_COUNT_FIELDS) {
    assertNonNegativeInteger(status[field], `${context}: ${field}`, field);
  }
  if (status.accepted_count + status.failed_count > status.request_count) {
    throw new ContractError(`${context}: result counts exceed request count`, {
      request_count: status.request_count,
      accepted_count: status.accepted_count,
      failed_count: status.failed_count,
    });
  }
  if (![null, "accepted", "failed"].includes(status.last_control_status)) {
    throw new ContractError(`${context}: invalid last control status`, {
      last_control_status: status.last_control_status,
    });
  }
  if (status.last_error_kind !== null && safeOptionalErrorKind(status.last_error_kind) !== status.last_error_kind) {
    throw new ContractError(`${context}: invalid last error kind`, {
      last_error_kind: status.last_error_kind,
    });
  }
  if (status.last_action_kind !== null && safeActionKind(status.last_action_kind) !== status.last_action_kind) {
    throw new ContractError(`${context}: invalid last action kind`, {
      last_action_kind: status.last_action_kind,
    });
  }
  const boundaryPolicy = status.boundary_policy;
  const requiredBoundaryFlags = [
    "counts_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_action_payloads",
    "no_candidates",
    "no_commands",
  ];
  if (!boundaryPolicy || typeof boundaryPolicy !== "object" || Array.isArray(boundaryPolicy)) {
    throw new ContractError(`${context}: boundary policy must be an object`);
  }
  const expectedBoundaryFlags = new Set(requiredBoundaryFlags);
  for (const flag of Object.keys(boundaryPolicy)) {
    if (!expectedBoundaryFlags.has(flag)) {
      throw new ContractError(`${context}: unexpected boundary policy flag`, { flag });
    }
  }
  for (const flag of requiredBoundaryFlags) {
    if (boundaryPolicy[flag] !== true) {
      throw new ContractError(`${context}: boundary policy flag must be true`, { flag });
    }
  }
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation is required`);
  }
  const serialized = JSON.stringify(status);
  if (UNSAFE_STATUS_SUMMARY_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: status must not expose unsafe diagnostics`);
  }
}

function summarizeGameControlReadiness(status) {
  if (status.local_endpoint_policy_status === "blocked") return "attention";
  if (status.request_count <= 0) return "idle";
  if (status.last_control_status === "failed") return "attention";
  return "active";
}

function recordResultStatus(status, result) {
  status.last_control_status = safeControlStatus(result.control_status);
  status.last_action_kind = safeActionKind(result.action_kind);
  const errorKind = safeOptionalErrorKind(
    result.error_kind ?? result.adapter_response_summary?.error_kind
  );
  status.last_error_kind = errorKind || null;
  if (result.control_status === "accepted") {
    status.accepted_count += 1;
    return;
  }
  status.failed_count += 1;
  if (errorKind === "unsafe_response") status.unsafe_response_count += 1;
  if (errorKind === "http_status") status.http_status_failure_count += 1;
  if (errorKind === "timeout") status.timeout_count += 1;
  if (errorKind === "request_error" || errorKind === "local_endpoint_policy_blocked") {
    status.request_error_count += 1;
  }
  if (errorKind === "expired_action") status.expired_action_count += 1;
}

function buildFailedGameControlResult({
  approvedAction,
  status,
  bridgeStatus,
  reason,
  errorKind = "http_status",
  responseKind = "omitted",
  responseOmitted = true,
}) {
  const result = {
    schema: "iris_game_control_result_v1",
    adapter: "http_game_control",
    trace_id: approvedAction.trace_id,
    trace_id_present: safeText(approvedAction.trace_id) !== "",
    event_id: approvedAction.event_id,
    event_id_present: safeText(approvedAction.event_id) !== "",
    accepted: false,
    executed: false,
    simulated: false,
    control_status: "failed",
    action_kind: approvedAction.action_kind,
    game_title: approvedAction.game_title,
    adapter_target_hint: approvedAction.adapter_target_hint,
    error_kind: safeErrorKind(errorKind),
    reason: safePublicResponseText(reason, "http_game_control_response_summary"),
    adapter_response_summary: {
      status,
      ok: false,
      response_kind: responseKind,
      response_omitted: responseOmitted,
      error_kind: safeErrorKind(errorKind),
      request_id: "",
      bridge_status: safePublicResponseText(bridgeStatus, "bridge_status_omitted"),
    },
  };
  assertGameControlResultSafe(result, "HTTP game control failed result");
  return result;
}

function rejectUnsafeHttpControlResponse({ parsed, approvedAction, status }) {
  try {
    assertNoForbiddenHttpControlResponseFields(parsed, "HTTP game control response");
    return null;
  } catch (error) {
    if (!(error instanceof ContractError)) throw error;
    return buildFailedGameControlResult({
      approvedAction,
      status,
      bridgeStatus: "unsafe_response",
      reason: "http_game_control_unsafe_response",
      errorKind: "unsafe_response",
      responseKind: parsed === TEXT_RESPONSE ? "text" : parsed ? "json" : "empty",
      responseOmitted: true,
    });
  }
}

function parseMaybeJson(text) {
  if (!String(text ?? "").trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return TEXT_RESPONSE;
  }
}

function safeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function safePublicResponseText(value, fallback) {
  const text = safeText(value);
  if (!text) return fallback;
  if (UNSAFE_RESPONSE_SUMMARY_PATTERN.test(text)) return fallback;
  return text;
}

function classifyRequestError(error) {
  if (error?.name === "AbortError") return "timeout";
  return "request_error";
}

function safeErrorKind(value) {
  const kind = String(value ?? "");
  if (
    [
      "http_status",
      "timeout",
      "request_error",
      "unsafe_response",
      "local_endpoint_policy_blocked",
      "expired_action",
    ].includes(kind)
  ) {
    return kind;
  }
  return "request_error";
}

function safeOptionalErrorKind(value) {
  if (value === undefined || value === null || value === "") return null;
  return safeErrorKind(value);
}

function safeControlStatus(value) {
  const status = String(value ?? "");
  if (["accepted", "failed"].includes(status)) return status;
  return null;
}

function safeActionKind(value) {
  const actionKind = String(value ?? "");
  if (["wait", "move_axis", "press_key", "click", "open_menu", "select_item"].includes(actionKind)) {
    return actionKind;
  }
  return null;
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function assertNonNegativeInteger(value, context, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context, { field, value });
  }
}

function assertNoForbiddenHttpControlResponseFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenHttpControlResponseFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_HTTP_CONTROL_RESPONSE_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: response must not echo candidates, commands, or commits`,
        { field, path }
      );
    }
    assertNoForbiddenHttpControlResponseFields(child, context, `${path}.${field}`);
  }
}
